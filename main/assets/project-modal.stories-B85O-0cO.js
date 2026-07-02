import{n as s,T as R}from"./iframe-CQd7E9rJ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{C as P}from"./confirm-dialog-BNoApUKx.js";import{P as H}from"./project-modal-CNYEF5Jp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CKzST0vR.js";import"./Select-ef7c0426.esm-D-Ui8QQ0.js";import"./check-1gyhuiNx.js";import"./triangle-alert-CTn7uNWC.js";import"./export-menu-BATPk7dE.js";import"./client-CIE6WgLp.js";import"./markdown-preview-Ce0alZ0N.js";import"./index.dom-D_wTd2ti.js";import"./file-text-osqzkqRK.js";import"./copy-CTIfoR1T.js";import"./file-code-corner-DcZe0o9W.js";import"./loader-circle-CN6E96MV.js";import"./api-e81uAW5a.js";import"./inbound-srGy8HMv.js";import"./folder-open-BkagkBQR.js";import"./folder-DuGkJeyP.js";import"./project-tag-B0HEsSEQ.js";import"./tag-color-picker-Ck5EOQmh.js";import"./source-list-editor-B-BdS8BC.js";import"./core.esm-BYnWcEjh.js";import"./source-icon-BSi-dNvc.js";import"./globe-BC-n4fKY.js";import"./sticky-note-zmuEdomF.js";import"./plus-BdCSHxhJ.js";import"./external-link-C32O_0Ue.js";import"./task-row-DCjjQ84P.js";import"./blocked-badge-CcrmmHYF.js";import"./selectable-icon-Bj6EruV9.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-C_GB0W6a.js";import"./pencil-epJRosQb.js";import"./trash-2-CyJf8waf.js";import"./refresh-cw-akydvQKr.js";import"./index-BT34iHP_.js";import"./lightbulb-Dxf4DrJ1.js";import"./templates-B6M1OYb3.js";import"./sparkles-BuZ9u89K.js";import"./brain-4BN0PKrV.js";import"./chevron-right-FkX2nPsY.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:a}=__STORYBOOK_MODULE_TEST__,ft={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[t=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(t,{})})})]},o={args:{project:null},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"New project"});await f(a(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"});await f(a(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:t})=>{const e=await a(t).findByRole("dialog",{name:"Edit project"}),k=a(e).getByRole("tab",{name:/sources/i});await C.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
