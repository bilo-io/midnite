import{aW as n,ax as R}from"./iframe-De3vIYFe.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DhcD76pr.js";import{P as H}from"./project-modal-BbLihOiZ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-f5SbHBPS.js";import"./Select-ef7c0426.esm-DYIQqTEi.js";import"./chevron-down-CKqqmoe8.js";import"./check-Bm8PJ8T2.js";import"./index-D9YoQMPw.js";import"./triangle-alert-nk1AuP-_.js";import"./export-menu-T331aXgr.js";import"./client-TMMpWYtw.js";import"./markdown-preview-PzgREHGL.js";import"./index.dom-D_wTd2ti.js";import"./file-text-2OcvAtFe.js";import"./copy-BpW-rnJS.js";import"./file-code-corner-CCm4Cllo.js";import"./loader-circle-CprDgUEN.js";import"./api-B5gUmFIT.js";import"./folder-open-C9w6I27S.js";import"./folder-Djj6CeCh.js";import"./tag-color-picker-CIO6r5OH.js";import"./project-tag-CeGUxzED.js";import"./sparkles-B_0HFKuV.js";import"./brain-B4r6JfxK.js";import"./chevron-right-XQd4UBTl.js";import"./markdown-editor-DLerx-Tz.js";import"./pencil-Bx6k-Ng6.js";import"./trash-2-CGtqjwgM.js";import"./templates-B6M1OYb3.js";import"./plus-BpAXLOEB.js";import"./task-row-Df32US-Z.js";import"./i18n-labels-BWN6R1HF.js";import"./selectable-icon-pmq_JPBN.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BxtckQgj.js";import"./arrow-left-TpDUlPUR.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
