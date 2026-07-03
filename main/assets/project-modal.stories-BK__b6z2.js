import{n as s,T as R}from"./iframe-CyuGqAe9.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-C1EBX8mV.js";import{P as H}from"./project-modal-D4y4Okcm.js";import"./preload-helper-Dp1pzeXC.js";import"./index-COiPRD0b.js";import"./Select-ef7c0426.esm-Bcw8rFWd.js";import"./check-CSptye5O.js";import"./triangle-alert-xbSOr64q.js";import"./export-menu-CP90ijQE.js";import"./client-CDEJRvyS.js";import"./markdown-preview-DVRj_mZq.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BWd2yTs2.js";import"./copy-CdJtETwg.js";import"./file-code-corner-uXRIBg1X.js";import"./loader-circle-CJOGfB8B.js";import"./api-Bq8Fx77f.js";import"./inbound-caimLB85.js";import"./folder-open-BliSWnFc.js";import"./folder-DVxss0Ri.js";import"./project-tag-BWdYwb7a.js";import"./tag-color-picker-DWSBdoG-.js";import"./source-list-editor-2yJVqJ31.js";import"./core.esm-B1G10Q4o.js";import"./source-icon-CjIqIx4j.js";import"./globe-keD1o-8D.js";import"./sticky-note-CAwZ3pnW.js";import"./plus-BHzNSJCP.js";import"./external-link-BGpRonph.js";import"./task-row-LpGXLpIS.js";import"./blocked-badge-CCv8Ox3f.js";import"./selectable-icon-zwxUAkRr.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DaxTNJwp.js";import"./pencil-DBmv7oHt.js";import"./trash-2-BlhTDK1A.js";import"./refresh-cw-CRltIGHy.js";import"./index-Bire4uIk.js";import"./lightbulb-DwbT8-nm.js";import"./templates-B6M1OYb3.js";import"./sparkles-qpd10359.js";import"./brain-CADE1CQ_.js";import"./chevron-right-DITEDcg9.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const St=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,St as __namedExportsOrder,ft as default};
